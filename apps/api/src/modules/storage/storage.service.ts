import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EnvironmentVariables } from "../../config/environment";

export type StoredFile = {
  key: string;
  body: Buffer;
  contentType: string;
};

@Injectable()
export class StorageService {
  private readonly driver: "local" | "r2";
  private readonly bucket: string;
  private readonly localRoot: string;
  private readonly s3: S3Client | null;

  public constructor(
    @Inject(ConfigService)
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.driver = configService.get("STORAGE_DRIVER", { infer: true });
    this.bucket = configService.get("R2_BUCKET", { infer: true });
    this.localRoot = join(process.cwd(), ".uploads");

    if (this.driver === "r2") {
      const accountId = configService.get("R2_ACCOUNT_ID", { infer: true });
      const endpoint =
        configService.get("R2_ENDPOINT", { infer: true }) ||
        (accountId.length > 0
          ? `https://${accountId}.r2.cloudflarestorage.com`
          : "");
      this.s3 = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId: configService.get("R2_ACCESS_KEY_ID", { infer: true }),
          secretAccessKey: configService.get("R2_SECRET_ACCESS_KEY", {
            infer: true,
          }),
        },
      });
    } else {
      this.s3 = null;
    }
  }

  public async putObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    if (this.driver === "r2") {
      if (this.s3 === null) {
        throw new Error("R2 client is not configured.");
      }
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
        }),
      );
      return;
    }

    const filePath = join(this.localRoot, params.key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, params.body);
  }

  public async getObject(key: string): Promise<StoredFile> {
    if (this.driver === "r2") {
      if (this.s3 === null) {
        throw new Error("R2 client is not configured.");
      }
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const bytes = await response.Body?.transformToByteArray();
      return {
        key,
        body: Buffer.from(bytes ?? []),
        contentType: response.ContentType ?? "application/octet-stream",
      };
    }

    const filePath = join(this.localRoot, key);
    const body = await readFile(filePath);
    return { key, body, contentType: "application/octet-stream" };
  }
}

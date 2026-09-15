import type { ArgumentsHost } from "@nestjs/common";
import {
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

type ProblemDetailsError = {
  field?: string;
  message: string;
};

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: ProblemDetailsError[];
};

type HttpRequestLike = {
  originalUrl: string;
};

type HttpResponseLike = {
  status: (statusCode: number) => {
    contentType: (value: string) => {
      json: (body: ProblemDetails) => void;
    };
  };
};

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const { detail, errors } = this.extractDetails(exception, status);

    response
      .status(status)
      .contentType("application/problem+json")
      .json({
        type: `https://httpstatuses.com/${String(status)}`,
        title: HttpStatus[status] ?? "Error",
        status,
        detail,
        instance: request.originalUrl,
        timestamp: new Date().toISOString(),
        ...(errors.length > 0 ? { errors } : {}),
      });
  }

  private extractDetails(
    exception: unknown,
    status: number,
  ): { detail: string; errors: ProblemDetailsError[] } {
    if (!(exception instanceof HttpException)) {
      if (exception instanceof Error) {
        this.logger.error(exception.message, exception.stack);
      }
      return { detail: "An unexpected error occurred.", errors: [] };
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === "string") {
      return { detail: exceptionResponse, errors: [] };
    }

    if (
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null &&
      "message" in exceptionResponse
    ) {
      const message = exceptionResponse.message;
      if (Array.isArray(message)) {
        return {
          detail: "Validation failed.",
          errors: message
            .filter((item): item is string => typeof item === "string")
            .map((item) => ({ message: item })),
        };
      }
      if (typeof message === "string" && message.length > 0) {
        return { detail: message, errors: [] };
      }
    }

    return { detail: HttpStatus[status] ?? "Error", errors: [] };
  }
}

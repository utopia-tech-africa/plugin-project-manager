import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@Controller("health")
@ApiTags("Health")
export class HealthController {
  @Get()
  @ApiOperation({
    summary: "Check API health",
    description:
      "Returns a simple status payload so the web app and operators can confirm the API is running.",
  })
  @ApiOkResponse({ description: "API is healthy." })
  public getHealth(): { status: string } {
    return { status: "ok" };
  }
}

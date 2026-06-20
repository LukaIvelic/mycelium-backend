import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiAssistantChat } from './assistant.decorator';
import { AssistantChatDto, type AssistantChatResponse } from './assistant.dto';
import { AssistantService } from './assistant.service';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @ApiAssistantChat()
  chat(
    @CurrentUser() userId: string,
    @Body() dto: AssistantChatDto,
  ): Promise<AssistantChatResponse> {
    return this.assistantService.chat({
      messages: dto.messages,
      projectId: dto.projectId,
      userId,
    });
  }
}

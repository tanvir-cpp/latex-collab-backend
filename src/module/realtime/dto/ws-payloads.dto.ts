import { IsBoolean, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class DocRefDto {
  @IsUUID()
  documentId: string;
}

export class ProjectRefDto {
  @IsUUID()
  projectId: string;
}

export class ChatSendDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}

export class ChatTypingDto {
  @IsUUID()
  projectId: string;

  @IsBoolean()
  isTyping: boolean;
}

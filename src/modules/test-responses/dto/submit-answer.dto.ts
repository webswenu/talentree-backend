import { IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class SubmitAnswerDto {
  @IsUUID()
  questionId: string;

  @IsNotEmpty()
  answer: any;
}

import { IsUUID } from 'class-validator';

export class StartTestDto {
  @IsUUID()
  testId: string;

  @IsUUID()
  workerProcessId: string;
}

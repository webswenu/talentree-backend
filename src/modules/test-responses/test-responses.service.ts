import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestResponse } from './entities/test-response.entity';
import { TestAnswer } from './entities/test-answer.entity';
import { StartTestDto } from './dto/start-test.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { EvaluateAnswerDto } from './dto/evaluate-answer.dto';

@Injectable()
export class TestResponsesService {
  constructor(
    @InjectRepository(TestResponse)
    private readonly testResponseRepository: Repository<TestResponse>,
    @InjectRepository(TestAnswer)
    private readonly testAnswerRepository: Repository<TestAnswer>,
  ) {}

  async startTest(startTestDto: StartTestDto): Promise<TestResponse> {
    // Verificar si ya existe una respuesta para este test y worker process
    const existingResponse = await this.testResponseRepository.findOne({
      where: {
        test: { id: startTestDto.testId },
        workerProcess: { id: startTestDto.workerProcessId },
      },
    });

    if (existingResponse && existingResponse.isCompleted) {
      throw new BadRequestException('Este test ya ha sido completado');
    }

    if (existingResponse) {
      return existingResponse;
    }

    const testResponse = this.testResponseRepository.create({
      test: { id: startTestDto.testId } as any,
      workerProcess: { id: startTestDto.workerProcessId } as any,
      startedAt: new Date(),
      isCompleted: false,
    });

    return this.testResponseRepository.save(testResponse);
  }

  async submitTest(responseId: string, submitTestDto: SubmitTestDto): Promise<TestResponse> {
    const testResponse = await this.testResponseRepository.findOne({
      where: { id: responseId },
      relations: ['test', 'test.questions', 'answers'],
    });

    if (!testResponse) {
      throw new NotFoundException(`TestResponse con ID ${responseId} no encontrado`);
    }

    if (testResponse.isCompleted) {
      throw new BadRequestException('Este test ya ha sido completado');
    }

    // Crear o actualizar respuestas
    const answers = submitTestDto.answers.map((answerDto) => {
      const existingAnswer = testResponse.answers?.find(
        (a) => a.question.id === answerDto.questionId,
      );

      if (existingAnswer) {
        existingAnswer.answer = answerDto.answer;
        return existingAnswer;
      }

      return this.testAnswerRepository.create({
        testResponse,
        question: { id: answerDto.questionId } as any,
        answer: answerDto.answer,
      });
    });

    await this.testAnswerRepository.save(answers);

    // Calcular puntaje automático si el test no requiere revisión manual
    if (!testResponse.test.requiresManualReview) {
      await this.autoEvaluate(responseId);
    }

    testResponse.completedAt = new Date();
    testResponse.isCompleted = true;

    return this.testResponseRepository.save(testResponse);
  }

  async autoEvaluate(responseId: string): Promise<TestResponse> {
    const testResponse = await this.testResponseRepository.findOne({
      where: { id: responseId },
      relations: ['test', 'test.questions', 'answers', 'answers.question'],
    });

    if (!testResponse) {
      throw new NotFoundException(`TestResponse con ID ${responseId} no encontrado`);
    }

    let totalScore = 0;
    let maxScore = 0;

    for (const answer of testResponse.answers) {
      const question = answer.question;
      maxScore += question.points;

      if (question.correctAnswers && question.correctAnswers.length > 0) {
        const isCorrect = this.checkAnswer(answer.answer, question.correctAnswers);
        answer.isCorrect = isCorrect;
        answer.score = isCorrect ? question.points : 0;
        totalScore += answer.score;
        await this.testAnswerRepository.save(answer);
      }
    }

    testResponse.score = totalScore;
    testResponse.maxScore = maxScore;
    testResponse.passed =
      testResponse.test.passingScore !== null &&
      totalScore >= testResponse.test.passingScore;

    return this.testResponseRepository.save(testResponse);
  }

  private checkAnswer(answer: any, correctAnswers: string[]): boolean {
    if (Array.isArray(answer)) {
      return (
        answer.length === correctAnswers.length &&
        answer.every((a) => correctAnswers.includes(a))
      );
    }
    return correctAnswers.includes(String(answer));
  }

  async evaluateAnswer(answerId: string, evaluateDto: EvaluateAnswerDto): Promise<TestAnswer> {
    const answer = await this.testAnswerRepository.findOne({
      where: { id: answerId },
      relations: ['testResponse'],
    });

    if (!answer) {
      throw new NotFoundException(`TestAnswer con ID ${answerId} no encontrado`);
    }

    answer.score = evaluateDto.score;
    answer.isCorrect = evaluateDto.isCorrect;
    answer.evaluatorComment = evaluateDto.evaluatorComment;

    await this.testAnswerRepository.save(answer);

    // Recalcular puntaje total del test
    await this.recalculateScore(answer.testResponse.id);

    return answer;
  }

  async recalculateScore(responseId: string): Promise<TestResponse> {
    const testResponse = await this.testResponseRepository.findOne({
      where: { id: responseId },
      relations: ['test', 'answers', 'answers.question'],
    });

    if (!testResponse) {
      throw new NotFoundException(`TestResponse con ID ${responseId} no encontrado`);
    }

    let totalScore = 0;
    let maxScore = 0;

    for (const answer of testResponse.answers) {
      maxScore += answer.question.points;
      totalScore += answer.score || 0;
    }

    testResponse.score = totalScore;
    testResponse.maxScore = maxScore;
    testResponse.passed =
      testResponse.test.passingScore !== null &&
      totalScore >= testResponse.test.passingScore;

    return this.testResponseRepository.save(testResponse);
  }

  async findOne(id: string): Promise<TestResponse> {
    const testResponse = await this.testResponseRepository.findOne({
      where: { id },
      relations: ['test', 'workerProcess', 'answers', 'answers.question'],
    });

    if (!testResponse) {
      throw new NotFoundException(`TestResponse con ID ${id} no encontrado`);
    }

    return testResponse;
  }

  async findByWorkerProcess(workerProcessId: string): Promise<TestResponse[]> {
    return this.testResponseRepository.find({
      where: { workerProcess: { id: workerProcessId } },
      relations: ['test', 'answers'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTest(testId: string): Promise<TestResponse[]> {
    return this.testResponseRepository.find({
      where: { test: { id: testId } },
      relations: ['workerProcess', 'answers'],
      order: { createdAt: 'DESC' },
    });
  }
}

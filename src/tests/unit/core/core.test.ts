import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../app.module';

describe('Core Application', () => {
  let app: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestInstance();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('should be defined', async () => {
    const result = await app.get(AppModule);
    expect(result).toBeDefined();
  });
});
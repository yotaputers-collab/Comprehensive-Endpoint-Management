import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from './password.service';

/**
 * Creates the first administrator when the users table is empty, so a fresh
 * deployment is usable without a manual SQL step.
 */
@Injectable()
export class AuthSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthSeeder.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly passwords: PasswordService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.users.count();
    if (existing > 0) {
      return;
    }

    const username = process.env.ADMIN_USERNAME ?? 'admin';
    const provided = process.env.ADMIN_INITIAL_PASSWORD;
    const password = provided && provided.length > 0
      ? provided
      : randomBytes(12).toString('base64url');

    const hash = await this.passwords.hash(password);
    await this.users.save(
      this.users.create({ username, passwordHash: hash, role: 'admin', active: true, tokenVersion: 0 }),
    );

    if (provided && provided.length > 0) {
      this.logger.warn(`Created administrator '${username}' from ADMIN_INITIAL_PASSWORD.`);
    } else {
      this.logger.warn(
        `Created administrator '${username}' with generated password: ${password} — ` +
          'log in and change it, or set ADMIN_INITIAL_PASSWORD next time.',
      );
    }
  }
}

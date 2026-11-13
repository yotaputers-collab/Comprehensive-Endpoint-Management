import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Password hashing with Node's built-in scrypt. Stored as
 * "scrypt$<salt hex>$<derived key hex>" so the format can evolve later.
 */
@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const derived = await scrypt(password, salt, KEY_LENGTH);
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, salt, hash] = String(stored ?? '').split('$');
    if (scheme !== 'scrypt' || !salt || !hash) {
      return false;
    }

    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== KEY_LENGTH) {
      return false;
    }

    const derived = await scrypt(password, salt, KEY_LENGTH);
    return timingSafeEqual(derived, expected);
  }
}

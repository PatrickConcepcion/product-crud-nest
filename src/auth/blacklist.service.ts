import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlacklistService {
  constructor(private prisma: PrismaService) {}

  private hashJti(jti: string) {
    return createHash('sha256').update(jti).digest('hex');
  }

  async revoke(jti: string, ttlSeconds: number) {
    if (!jti || ttlSeconds <= 0) {
      return;
    }
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const jtiHash = this.hashJti(jti);

    await this.prisma.revokedToken.upsert({
      where: { jtiHash },
      update: { expiresAt },
      create: { jtiHash, expiresAt },
    });
  }

  async isRevoked(jti?: string): Promise<boolean> {
    if (!jti) return true;
    const jtiHash = this.hashJti(jti);
    const record = await this.prisma.revokedToken.findUnique({
      where: { jtiHash },
    });
    if (!record) return false;
    const now = new Date();
    if (record.expiresAt <= now) {
      await this.prisma.revokedToken.delete({ where: { jtiHash } });
      return false;
    }
    return true;
  }
}

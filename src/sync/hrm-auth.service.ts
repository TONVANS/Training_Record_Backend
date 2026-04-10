// src/sync/hrm-auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface HrmLoginResponse {
    token: string;
    expires_in?: number;
}

@Injectable()
export class HrmAuthService {
    private readonly logger = new Logger(HrmAuthService.name);

    private accessToken: string = '';   // ✅ ບໍ່ໃຊ້ null ແລ້ວ
    private tokenExpiresAt: number = 0;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) { }

    async getToken(): Promise<string> {
        const now = Date.now();

        // ✅ ເພີ່ມ buffer ຈາກ 1 ນາທີ → 5 ນາທີ
        if (this.accessToken && now < this.tokenExpiresAt - 300_000) {
            return this.accessToken;
        }

        this.logger.log('🔑 Token expired or missing — logging in to HRM...');
        return this.login();
    }

    private async login(): Promise<string> {
        // ✅ ໃຊ້ ?? '' ເພື່ອ fallback ກໍລະນີ undefined
        const loginUrl = this.config.get<string>('HRM_API_LOGIN_URL') ?? '';
        const username = this.config.get<string>('HRM_API_USERNAME') ?? '';
        const password = this.config.get<string>('HRM_API_PASSWORD') ?? '';

        if (!loginUrl || !username || !password) {
            throw new Error('HRM credentials not configured in .env');
        }

        try {
            const { data } = await firstValueFrom(
                this.http.post<HrmLoginResponse>(loginUrl, { username, password }),
            );

            // ✅ ກວດ access_token ກ່ອນ assign
            if (!data?.token) {
                throw new Error('No access_token in HRM login response');
            }

            this.accessToken = data.token;           // string ແນ່ນອນ
            const expiresIn = data.expires_in ?? 3600;
            this.tokenExpiresAt = Date.now() + expiresIn * 1000;

            this.logger.log(`✅ HRM Login success! Token valid for ${expiresIn}s`);
            return this.accessToken;

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ HRM Login failed: ${message}`);
            throw new Error(`Cannot authenticate with HRM API: ${message}`);
        }
    }

    async refreshToken(): Promise<string> {
        this.logger.warn('⚠️  Forcing token refresh...');
        this.accessToken = '';   // ✅ reset ດ້ວຍ empty string
        this.tokenExpiresAt = 0;
        return this.login();
    }
}
import { Repository, ApiKey, GlobalConfig } from '@/types/dashboard';
import { EncryptionService, EncryptionResult } from './encryption';

export interface ExportData {
  version: string;
  timestamp: string;
  data: {
    globalConfig?: GlobalConfig;
    repositories?: Repository[];
    apiKeys?: ApiKey[];
    security?: SecurityConfig;
  };
  encrypted?: boolean;
  encryptionData?: EncryptionResult;
}

export interface SecurityConfig {
  passkeyEnabled: boolean;
  webhookSecurityEnabled: boolean;
  encryptionEnabled: boolean;
  lastSecurityUpdate: string;
}

export interface ExportOptions {
  includeGlobalConfig: boolean;
  includeRepositories: boolean;
  includeApiKeys: boolean;
  includeSecurity: boolean;
  encrypt: boolean;
  password?: string;
}

export class ExportImportService {
  static async exportData(
    globalConfig: GlobalConfig,
    repositories: Repository[],
    apiKeys: ApiKey[],
    security: SecurityConfig,
    options: ExportOptions
  ): Promise<ExportData> {
    const exportData: ExportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {},
      encrypted: options.encrypt
    };

    if (options.includeGlobalConfig) {
      exportData.data.globalConfig = globalConfig;
    }

    if (options.includeRepositories) {
      exportData.data.repositories = repositories;
    }

    if (options.includeApiKeys) {
      exportData.data.apiKeys = apiKeys;
    }

    if (options.includeSecurity) {
      exportData.data.security = security;
    }

    if (options.encrypt && options.password) {
      const dataString = JSON.stringify(exportData.data);
      const encryptionResult = await EncryptionService.encrypt(dataString, options.password);
      exportData.encryptionData = encryptionResult;
      exportData.data = {}; // Clear unencrypted data
    }

    return exportData;
  }

  static async importData(
    exportData: ExportData,
    password?: string
  ): Promise<{
    success: boolean;
    data?: {
      globalConfig?: GlobalConfig;
      repositories?: Repository[];
      apiKeys?: ApiKey[];
      security?: SecurityConfig;
    };
    error?: string;
  }> {
    try {
      let data = exportData.data;

      if (exportData.encrypted && exportData.encryptionData) {
        if (!password) {
          return { success: false, error: 'Password required for encrypted data' };
        }

        const decryptionResult = await EncryptionService.decrypt(
          exportData.encryptionData,
          password
        );

        if (!decryptionResult.success) {
          return { success: false, error: 'Invalid password or corrupted data' };
        }

        try {
          data = JSON.parse(decryptionResult.decrypted);
        } catch {
          return { success: false, error: 'Invalid encrypted data format' };
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to import data' };
    }
  }

  static downloadFile(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async readFile(file: File): Promise<ExportData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
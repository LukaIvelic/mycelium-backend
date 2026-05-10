const globalPrefix = 'api';

interface MyceliumInformation {
  title: string;
  version: string;
  description: string;
  tag: string;
  globalPrefix: string;
  oAuthTokenUrl: string;
  allowedOrigins: string[];
  swaggerPath: string;
  swaggerEnabled: boolean;
  defaultPort: number;
}

export const MyceliumInformation: MyceliumInformation = {
  title: 'Mycelium Backend Refactor',
  version: '1.0.0',
  description: 'Backend API documentation for Mycelium',
  tag: 'mycelium',
  globalPrefix: globalPrefix,
  oAuthTokenUrl: `/${globalPrefix}/authentication/token`,
  allowedOrigins: ['http://localhost:3001', 'https://www.myceliums.dev'],
  swaggerPath: 'docs',
  swaggerEnabled: process.env.NODE_ENV !== 'production',
  defaultPort: 8000,
};

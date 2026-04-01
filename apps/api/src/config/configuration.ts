export default () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['API_PORT'] ?? '4000', 10),

  database: {
    url: process.env['DATABASE_URL'],
  },

  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    password: process.env['REDIS_PASSWORD'],
  },

  jwt: {
    privateKey: process.env['JWT_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
    publicKey: process.env['JWT_PUBLIC_KEY']?.replace(/\\n/g, '\n'),
    accessTokenTtl: parseInt(process.env['JWT_ACCESS_TOKEN_TTL'] ?? '900', 10),
    refreshTokenTtl: parseInt(process.env['JWT_REFRESH_TOKEN_TTL'] ?? '604800', 10),
  },

  s3: {
    endpoint: process.env['S3_ENDPOINT'],
    region: process.env['S3_REGION'] ?? 'us-east-1',
    accessKeyId: process.env['S3_ACCESS_KEY_ID'],
    secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'],
    bucketName: process.env['S3_BUCKET_NAME'] ?? 'newsplus-media',
    publicUrl: process.env['S3_PUBLIC_URL'],
  },

  app: {
    webUrl: process.env['WEB_URL'] ?? 'http://localhost:3000',
    adminUrl: process.env['ADMIN_URL'] ?? 'http://localhost:3001',
  },
});

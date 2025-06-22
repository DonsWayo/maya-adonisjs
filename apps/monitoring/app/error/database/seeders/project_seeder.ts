import Project from '#error/models/project'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { randomUUID } from 'node:crypto'

export default class ProjectSeeder extends BaseSeeder {
  async run() {
    // Check if projects already exist
    const existingProjects = await Project.all()

    // If projects already exist, skip seeding
    if (existingProjects.length > 0) {
      console.log('Projects already exist, skipping seeding')
      return
    }

    // Use a default organization ID (this should match a company ID from the main app)
    const defaultOrganizationId = '5660a1b2-6fc3-4eba-90bf-13496ee275d7'

    // Create demo projects
    await Project.createMany([
      {
        id: randomUUID(),
        name: 'Frontend Application',
        slug: 'frontend-app',
        platform: 'javascript',
        status: 'active',
        description: 'Main frontend React application',
        organizationId: defaultOrganizationId,
        publicKey: randomUUID().replace(/-/g, ''),
        secretKey: randomUUID().replace(/-/g, ''),
        dsn: `https://${randomUUID().replace(/-/g, '')}@sentry.example.com/${randomUUID()}`,
      },
      {
        id: randomUUID(),
        name: 'Backend API',
        slug: 'backend-api',
        platform: 'node',
        status: 'active',
        description: 'Node.js backend API service',
        organizationId: defaultOrganizationId,
        publicKey: randomUUID().replace(/-/g, ''),
        secretKey: randomUUID().replace(/-/g, ''),
        dsn: `https://${randomUUID().replace(/-/g, '')}@sentry.example.com/${randomUUID()}`,
      },
      {
        id: randomUUID(),
        name: 'Mobile App',
        slug: 'mobile-app',
        platform: 'react-native',
        status: 'active',
        description: 'React Native mobile application',
        organizationId: defaultOrganizationId,
        publicKey: randomUUID().replace(/-/g, ''),
        secretKey: randomUUID().replace(/-/g, ''),
        dsn: `https://${randomUUID().replace(/-/g, '')}@sentry.example.com/${randomUUID()}`,
      },
      {
        id: randomUUID(),
        name: 'Data Processing Service',
        slug: 'data-processing',
        platform: 'go',
        status: 'active',
        description: 'Go-based data processing microservice',
        organizationId: defaultOrganizationId,
        publicKey: randomUUID().replace(/-/g, ''),
        secretKey: randomUUID().replace(/-/g, ''),
        dsn: `https://${randomUUID().replace(/-/g, '')}@sentry.example.com/${randomUUID()}`,
      },
      {
        id: randomUUID(),
        name: 'Legacy System',
        slug: 'legacy-system',
        platform: 'python',
        status: 'inactive',
        description: 'Legacy Python application being phased out',
        organizationId: defaultOrganizationId,
        publicKey: randomUUID().replace(/-/g, ''),
        secretKey: randomUUID().replace(/-/g, ''),
        dsn: `https://${randomUUID().replace(/-/g, '')}@sentry.example.com/${randomUUID()}`,
      },
    ])
  }
}

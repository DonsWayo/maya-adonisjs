import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Company from '#companies/models/company'

export default class CompanySeeder extends BaseSeeder {
  async run() {
    // Check if companies already exist to avoid duplicates
    const existingCount = await Company.query().count('*', 'total')
    const total = Number(existingCount[0].$extras.total)
    
    if (total > 0) {
      console.log('Companies already seeded, skipping...')
      return
    }

    // Create sample companies
    await Company.createMany([
      {
        name: 'Acme Corporation',
        description: 'A global leader in innovative solutions',
        website: 'https://acme.example.com',
        email: 'info@acme.example.com',
        phone: '+1-555-123-4567',
        address: '123 Main Street',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        logoUrl: null,
        customData: { industry: 'Technology', founded: 1985 }
      },
      {
        name: 'Globex Industries',
        description: 'Pioneering sustainable manufacturing',
        website: 'https://globex.example.com',
        email: 'contact@globex.example.com',
        phone: '+1-555-987-6543',
        address: '456 Tech Boulevard',
        city: 'Silicon Valley',
        state: 'CA',
        postalCode: '94025',
        country: 'USA',
        logoUrl: null,
        customData: { industry: 'Manufacturing', founded: 1992 }
      },
      {
        name: 'Initech Software',
        description: 'Enterprise software solutions',
        website: 'https://initech.example.com',
        email: 'support@initech.example.com',
        phone: '+1-555-456-7890',
        address: '789 Innovation Drive',
        city: 'Austin',
        state: 'TX',
        postalCode: '73301',
        country: 'USA',
        logoUrl: null,
        customData: { industry: 'Software', founded: 2001 }
      }
    ])

    console.log('Companies seeded successfully')
  }
}

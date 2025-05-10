import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'

import Project from '#error/models/project'
import { createProjectValidator, updateProjectValidator } from '#error/validators'

export default class ProjectsController {
  /**
   * Display a list of projects
   */
  public async index({ inertia }: HttpContext) {
    const projects = await Project.all()
    
    return inertia.render('error/projects/index', {
      projects
    })
  }

  /**
   * Display the form for creating a new project
   */
  public async create({ inertia }: HttpContext) {
    return inertia.render('error/projects/create')
  }

  /**
   * Display a specific project
   */
  public async show({ params, response, inertia }: HttpContext) {
    const project = await Project.find(params.id)
    
    if (!project) {
      return response.notFound({ error: 'Project not found' })
    }
    
    // Get error statistics for this project
    // This would be implemented in a real app
    const stats = {
      totalErrors: 0,
      todayErrors: 0,
      resolvedErrors: 0
    }
    
    return inertia.render('error/projects/show', {
      project,
      stats
    })
  }

  /**
   * Create a new project
   */
  public async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createProjectValidator)
    
    const project = new Project()
    project.id = randomUUID()
    project.merge(payload)
    await project.save()
    
    return response.redirect().toRoute('projects.show', { id: project.id })
  }

  /**
   * Display the form for editing a project
   */
  public async edit({ params, inertia, response }: HttpContext) {
    const project = await Project.find(params.id)
    
    if (!project) {
      return response.notFound({ error: 'Project not found' })
    }
    
    return inertia.render('error/projects/edit', { project })
  }

  /**
   * Update an existing project
   */
  public async update({ params, request, response }: HttpContext) {
    const project = await Project.find(params.id)
    
    if (!project) {
      return response.notFound({ error: 'Project not found' })
    }
    
    const payload = await request.validateUsing(updateProjectValidator)
    project.merge(payload)
    await project.save()
    
    return response.redirect().toRoute('projects.show', { id: project.id })
  }

  /**
   * Delete a project
   */
  public async destroy({ params, response }: HttpContext) {
    const project = await Project.find(params.id)
    
    if (!project) {
      return response.notFound({ error: 'Project not found' })
    }
    
    await project.delete()
    
    return response.redirect().toRoute('projects.index')
  }
}

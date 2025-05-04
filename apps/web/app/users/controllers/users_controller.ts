import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import emitter from '@adonisjs/core/services/emitter'

import User from '#users/models/user'
import Role from '#users/models/role'

import UserDto from '#users/dtos/user'
import RoleDto from '#users/dtos/role'

import UserPolicy from '#users/policies/user_policy'

import { createUserValidator, editUserValidator } from '#users/validators'

export default class UsersController {
  public async index({ bouncer, inertia }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('viewList')

    const users = await User.query().preload('role')
    const roles = await Role.all()

    await User.preComputeUrls(users)

    return inertia.render('users/index', {
      users: UserDto.fromArray(users),
      roles: RoleDto.fromArray(roles),
    })
  }

  public async store({ bouncer, request, response }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('create')

    const payload = await request.validateUsing(createUserValidator)

    const user = new User()
    // Generate a UUID for the user
    user.id = `usr_${randomUUID()}`
    user.merge(payload)

    await user.save()
    
    // Emit event for the new user
    await emitter.emit('user:created', { user, source: 'admin_panel' })

    return response.redirect().toRoute('users.index')
  }

  public async update({ bouncer, params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    await bouncer.with(UserPolicy).authorize('update', user)

    const payload = await request.validateUsing(editUserValidator, { meta: { userId: params.id } })
    user.merge(payload)

    await user.save()
    
    // Emit event for the updated user
    await emitter.emit('user:updated', { user, source: 'admin_panel' })

    return response.redirect().toRoute('users.index')
  }

  public async destroy({ bouncer, params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    await bouncer.with(UserPolicy).authorize('delete', user)

    const userId = user.id
    await user.delete()
    
    // Emit event for the deleted user
    await emitter.emit('user:deleted', { userId })

    return response.redirect().toRoute('users.index')
  }
}

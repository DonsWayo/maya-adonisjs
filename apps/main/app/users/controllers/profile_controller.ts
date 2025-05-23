import type { HttpContext } from '@adonisjs/core/http'
import { attachmentManager } from '@jrmc/adonis-attachment'
import emitter from '@adonisjs/core/services/emitter'

import User from '#users/models/user'

import UserDto from '#users/dtos/user'

import { updateProfileValidator } from '#users/validators'

export default class ProfileController {
  public async show({ auth, inertia }: HttpContext) {
    await User.preComputeUrls(auth.user!)

    return inertia.render('users/profile', {
      profile: new UserDto(auth.user),
    })
  }

  public async handle({ auth, request, response }: HttpContext) {
    const { avatar, ...payload } = await request.validateUsing(updateProfileValidator)

    const user = await User.findOrFail(auth.user!.id)

    if (avatar) {
      user.avatar = await attachmentManager.createFromFile(avatar)
    }

    user.merge({
      ...payload,
    })

    await user.save()
    
    // Emit event for the updated user profile
    await emitter.emit('user:updated', { user, source: 'profile_update' })

    return response.redirect().toRoute('profile.show')
  }
}

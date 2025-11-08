import { Controller, Post, Put, Body, BadRequestException, Get, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

@Post('signup')
async signup(@Body() body: any) {
  try {
    // Map 'name' from frontend to 'fullname' for backend
    const user = await this.usersService.createUser({
      fullname: body.name,
      email: body.email,
      password: body.password,
    });
    return { message: 'Signup successful', user };
  } catch (error) {
    console.error('Signup error:', error);
    throw new BadRequestException(error.message || 'Signup failed');
  }
}

  @Post('login')
  async login(@Body() body: any) {
    try {
      const user = await this.usersService.validateUser(body.email, body.password);
        if (!user) {
          const emailExists = await this.usersService.emailExists(body.email);
          if (!emailExists) {
            return { user: null, message: 'There is no existing account for this email.' };
          } else {
            return { user: null, message: 'Invalid credentials' };
          }
        }
        return { message: 'Login successful', user };
    } catch (error) {
      console.error('Login error:', error);
      throw new BadRequestException(error.message || 'Login failed');
    }
  }

  @Get(['users/:id', 'api/users/:id'])
  async getUser(@Param('id', ParseIntPipe) id: number) {
    try {
      const user = await this.usersService.getUserById(id);
      if (!user) throw new NotFoundException('User not found');
      return { success: true, user };
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  @Post(['users/:id/security', 'api/users/:id/security'])
  async updateSecurity(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    try {
      const { currentPassword, email, newPassword } = body;
      if (!currentPassword) {
        throw new BadRequestException('Current password required');
      }
      const updated = await this.usersService.updateSecurity(id, currentPassword, email, newPassword);
      return { success: true, user: updated };
    } catch (error) {
      console.error('Update security error:', error);
      // Normalize known errors to BadRequest for frontend clarity
      if (error.message && (error.message.includes('incorrect') || error.message.includes('registered') || error.message.includes('not found'))) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to update security settings');
    }
  }

  @Put(['users/:id/security', 'api/users/:id/security'])
  async updateSecurityPut(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    // reuse same logic as POST
    return this.updateSecurity(id, body);
  }
}

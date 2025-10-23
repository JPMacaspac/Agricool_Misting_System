import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
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
}

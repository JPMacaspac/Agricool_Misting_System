
  import { Injectable } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { User } from './user.entity';
  import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

    async emailExists(email: string) {
      const user = await this.userRepository.findOne({ where: { email } });
      return !!user;
    }

  async createUser(data: { fullname: string; email: string; password: string }) {
    const existingUser = await this.userRepository.findOne({ where: { email: data.email } });
    if (existingUser) throw new Error('Email already registered');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      fullname: data.fullname,
      email: data.email,
      password: hashedPassword,
      role: 'client',
    });

    return this.userRepository.save(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return user;
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;
    // Exclude password before returning
    // create a shallow copy
    const { password, ...rest } = user as any;
    return rest;
  }

  async updateSecurity(id: number, currentPassword: string, email?: string, newPassword?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('User not found');

    // verify current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new Error('Current password is incorrect');

    // If email is changing, ensure uniqueness
    if (email && email !== user.email) {
      const exists = await this.userRepository.findOne({ where: { email } });
      if (exists) throw new Error('Email already registered');
      user.email = email;
    }

    // If newPassword provided, hash and update
    if (newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
    }

    await this.userRepository.save(user);
    // return safe user info (without password)
    const { password, ...rest } = user as any;
    return rest;
  }
}

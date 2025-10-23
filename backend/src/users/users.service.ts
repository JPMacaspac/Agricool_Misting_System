
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
}

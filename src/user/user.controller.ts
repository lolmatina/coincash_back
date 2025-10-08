import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Res,
  Inject,
  forwardRef,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    try {
      const user = await this.userService.create(createUserDto);
      await this.authService.initiateEmailVerification(user);

      return res.json({
        message: 'User created successfully. Please verify your email.',
        user: {
          id: user.id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req, @Res() res: Response) {
    try {
      const user = req.user;
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          email_verified_at: user.email_verified_at,
          documents_submitted_at: user.documents_submitted_at,
          documents_verified_at: user.documents_verified_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const user = await this.userService.findOne(id);
      return res.json(user);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Res() res: Response,
  ) {
    try {
      const user = await this.userService.update(id, updateUserDto);
      return res.json(user);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      await this.userService.remove(id);
      return res.json({
        message: 'User deleted successfully',
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

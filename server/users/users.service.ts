import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddressService } from '../address/address.service';
import { AddAddressDto } from '../address/dtos/add-address.dto';
import { UpdateAddressDto } from '../address/dtos/update-address.dto';
import { Address } from '../address/entities/address.entity';
import { RegisterActionDto } from '../auth/dtos/register-action.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly addressService: AddressService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepo.find({
      relations: ['defaultAddress'],
    });
  }

  async findByIdAndUpdate(id: string, updateDto: any) {
    try {
      return await this.usersRepo.save({
        id,
        ...updateDto,
      });
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async addressOwner(addressId: string): Promise<User> {
    const address = await this.addressService.findById(addressId);

    return address.user;
  }

  async updateAddress(
    addressId: string,
    userId: string,
    data: UpdateAddressDto,
  ): Promise<User> {
    const addressOwner = await this.addressOwner(addressId);

    if (addressOwner.id !== userId) {
      throw new BadRequestException('you cant edit this address');
    }

    await this.addressService.updateAddress(addressId, data);

    return await this.findById(userId, ['addresses']);
  }

  async addAddress(id: string, data: AddAddressDto): Promise<User> {
    const address = await this.addressService.createAddress(data);

    let user = await this.findById(id);
    if (!user.defaultAddress) {
      await this.findByIdAndUpdate(id, {
        defaultAddress: address,
      });

      user = await this.findById(id);
    }

    return user;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User> {
    return (await this.usersRepo.find({ phoneNumber }))[0];
  }

  findById(
    id: string,
    relations: string[] = ['defaultAddress', 'addresses'],
  ): Promise<User> {
    return this.usersRepo.findOne(id, {
      relations,
    });
  }

  async create({ phoneNumber }: RegisterActionDto): Promise<User> {
    const user = this.usersRepo.create({ phoneNumber });

    try {
      return await this.usersRepo.save(user);
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }
}

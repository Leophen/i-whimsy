import { Entity, BaseEntity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity({name: 'users'})

export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  readonly key!: number;

  @Column()
  account!: string;

  @Column()
  password!: string;

  @Column()
  nickname!: string;

  @Column()
  avatar!: string;

  @Column()
  introduce!: string;
}
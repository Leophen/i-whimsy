import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './user'

@Entity({name: 'users_auths'})

export class UserAuths extends BaseEntity {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @ManyToOne(() => User, {
    cascade: true
  })
  @JoinColumn({name: 'user_id'})
  user!: User

  @Column()
  identity_type!: string;

  @Column()
  identifier!: string;

  @Column()
  credential!: string;
}
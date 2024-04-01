// Follow entity
import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity("Follow")
export class Follow {
  @PrimaryGeneratedColumn("uuid")
  id!: number;

  @ManyToOne(() => User)
  follower!: User;

  @ManyToOne(() => User)
  following!: User;

  // You can add more attributes as needed
}

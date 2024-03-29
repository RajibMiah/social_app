// Comment entity
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@Entity("Comment")
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  content!: string;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Post)
  post!: Post;

  // You can add more attributes as needed
}

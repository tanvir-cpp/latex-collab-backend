import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('documents')
@Index(['projectId', 'path'], { unique: true })
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  /** File path inside the project, e.g. `main.tex` or `chapters/intro.tex`. */
  @Column({ type: 'varchar', length: 255 })
  path: string;

  /** Plain-text snapshot of the file. */
  @Column({ type: 'text', default: '' })
  content: string;

  /** Encoded Yjs document state used by the realtime layer; never returned by the REST API. */
  @Column({ type: 'bytea', nullable: true, select: false })
  yjsState: Buffer | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

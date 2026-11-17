#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/689d54819bec67d7082e33c0eb89a4d3c4183b1743a61e6a86fdb95152e451d1/contract';
import endContract from '../../snapshots/689d54819bec67d7082e33c0eb89a4d3c4183b1743a61e6a86fdb95152e451d1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e9d85d638d46a43f1db4d30aee486b54d91b784f00a664f4bcc3eef3243a5532/contract';
import startContract from '../../snapshots/e9d85d638d46a43f1db4d30aee486b54d91b784f00a664f4bcc3eef3243a5532/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'payments',
        constraint: 'payments_status_check_70878036',
      }),
      this.createTable({
        schema: 'public',
        table: 'refresh_tokens',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('familyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revokedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tutor_payouts',
        columns: [
          col('adminNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('approvedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('approvedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('bookingId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('commissionAmount', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('commissionRate', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('BDT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('grossAmount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('netAmount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('paidAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('paidById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('payoutAccountNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('payoutMethod', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('transferReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tutorProfileId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'tutor_payouts_payoutMethod_check_d9dc71d8',
            sql`"payoutMethod" IN ('BKASH', 'NAGAD', 'ROCKET')`,
          ),
          checkExpression(
            'tutor_payouts_status_check_371b29a4',
            sql`"status" IN ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED')`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'payments',
        column: col('checkoutUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'payments',
        column: col('idempotencyKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'payments',
        column: col('providerSessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tutor_profiles',
        column: col('payoutMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'payments',
        constraint: 'payments_status_check_8b1e8c18',
        expression: sql`"status" IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED')`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'payments',
        constraint: 'payments_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payments',
        constraint: 'payments_providerSessionId_key',
        columns: ['providerSessionId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'refresh_tokens',
        constraint: 'refresh_tokens_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tutor_payouts',
        constraint: 'tutor_payouts_bookingId_key',
        columns: ['bookingId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tutor_payouts',
        constraint: 'tutor_payouts_transferReference_key',
        columns: ['transferReference'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tutor_profiles',
        constraint: 'tutor_profiles_payoutMethod_check_d9dc71d8',
        expression: sql`"payoutMethod" IN ('BKASH', 'NAGAD', 'ROCKET')`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'refresh_tokens',
        index: 'refresh_tokens_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refresh_tokens',
        index: 'refresh_tokens_familyId_idx_3d03045e',
        columns: ['familyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refresh_tokens',
        index: 'refresh_tokens_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tutor_payouts',
        index: 'tutor_payouts_approvedById_idx_01ef8410',
        columns: ['approvedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tutor_payouts',
        index: 'tutor_payouts_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tutor_payouts',
        index: 'tutor_payouts_paidById_idx_406e50ef',
        columns: ['paidById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tutor_payouts',
        index: 'tutor_payouts_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tutor_payouts',
        index: 'tutor_payouts_tutorProfileId_idx_c9a9af10',
        columns: ['tutorProfileId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refresh_tokens',
        foreignKey: {
          name: 'refresh_tokens_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tutor_payouts',
        foreignKey: {
          name: 'tutor_payouts_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'bookings', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tutor_payouts',
        foreignKey: {
          name: 'tutor_payouts_tutorProfileId_fkey',
          columns: ['tutorProfileId'],
          references: { schema: 'public', table: 'tutor_profiles', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tutor_payouts',
        foreignKey: {
          name: 'tutor_payouts_approvedById_fkey',
          columns: ['approvedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tutor_payouts',
        foreignKey: {
          name: 'tutor_payouts_paidById_fkey',
          columns: ['paidById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

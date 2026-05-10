# Strict TypeScript Changes

This document records the changes made to support strict TypeScript compilation.

## Request Metadata Typing

Added `src/types/express.d.ts` to augment `Express.Request` with the request metadata written by guards:

- `request['user']` from `JwtGuard`
- `request['apiKey']` from `ApiKeyGuard`
- `request['project']` from `ProjectOwnershipGuard`

This keeps the existing request-context pattern while making the metadata visible to TypeScript.

## Definite Assignment

Added definite-assignment markers (`!`) to DTO and Swagger response classes that are populated by Nest validation, transformation, or response serialization rather than by explicit constructors.

Updated areas:

- Authentication DTOs
- User DTOs and Swagger response models
- Project DTOs and Swagger response models
- API key Swagger response models
- Log and log-detail DTOs and Swagger response models

## Bloom Service Initialization

Marked `BloomService.bloom` with definite assignment because it is initialized in `onModuleInit`.

## External Type Declarations

Added `@types/pg` as a development dependency so the PostgreSQL client import has type declarations under strict mode.

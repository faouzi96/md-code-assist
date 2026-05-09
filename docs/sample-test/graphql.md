# GraphQL — Formatter Test

Press `Shift+Alt+F` to format all blocks with Prettier (bundled — no install required).

---

## Formatting — schema definition (Prettier will normalize indentation and spacing)

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  role: Role!
  posts: [Post!]!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  body: String!
  published: Boolean!
  author: User!
  tags: [String!]!
  createdAt: String!
  updatedAt: String!
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

type Query {
  user(id: ID!): User
  users(role: Role, limit: Int = 10, offset: Int = 0): [User!]!
  post(id: ID!): Post
  posts(published: Boolean, limit: Int = 20): [Post!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
  createPost(input: CreatePostInput!): Post!
  publishPost(id: ID!): Post!
}
```

## Formatting — input types and interfaces

```graphql
interface Node {
  id: ID!
}
interface Timestamped {
  createdAt: String!
  updatedAt: String!
}

type Comment implements Node & Timestamped {
  id: ID!
  body: String!
  author: User!
  post: Post!
  createdAt: String!
  updatedAt: String!
}

input CreateUserInput {
  name: String!
  email: String!
  password: String!
  role: Role = VIEWER
}
input UpdateUserInput {
  name: String
  email: String
  role: Role
}
input CreatePostInput {
  title: String!
  body: String!
  tags: [String!]
  published: Boolean = false
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type UserEdge {
  node: User!
  cursor: String!
}
```

## Formatting — queries and fragments

```graphql
fragment UserFields on User {
  id
  name
  email
  role
  createdAt
}
fragment PostSummary on Post {
  id
  title
  published
  createdAt
  author {
    ...UserFields
  }
}

query GetUser($id: ID!) {
  user(id: $id) {
    ...UserFields
    posts(limit: 5) {
      ...PostSummary
    }
  }
}

query ListUsers($role: Role, $limit: Int = 10) {
  users(role: $role, limit: $limit) {
    ...UserFields
    posts {
      id
      title
    }
  }
}

mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    published
    author {
      id
      name
    }
  }
}

subscription OnPostPublished {
  postPublished {
    id
    title
    author {
      name
    }
  }
}
```

## Formatting — directives and SDL

```graphql
directive @auth(requires: Role = VIEWER) on FIELD_DEFINITION
directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION | ENUM_VALUE
directive @cacheControl(
  maxAge: Int
  scope: CacheControlScope
) on FIELD_DEFINITION | OBJECT | INTERFACE

enum CacheControlScope {
  PUBLIC
  PRIVATE
}

type Query {
  publicPosts: [Post!]! @cacheControl(maxAge: 300, scope: PUBLIC)
  myPosts: [Post!]! @auth(requires: VIEWER)
  adminStats: AdminStats! @auth(requires: ADMIN)
}

type Subscription {
  postPublished: Post! @auth(requires: VIEWER)
  commentAdded(postId: ID!): Comment! @auth(requires: VIEWER)
}
```

## Formatting — with aliases and inline fragments

```graphql
query Dashboard {
  recentPosts: posts(limit: 5, published: true) {
    ...PostSummary
  }
  draftPosts: posts(limit: 5, published: false) {
    ...PostSummary
  }
  adminUsers: users(role: ADMIN) {
    id
    name
    email
  }
  totalEditors: users(role: EDITOR) {
    id
  }
}

query SearchContent($query: String!) {
  results: search(query: $query) {
    __typename
    ... on User {
      id
      name
      email
    }
    ... on Post {
      id
      title
      published
    }
  }
}
```

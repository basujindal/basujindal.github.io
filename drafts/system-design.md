---
title: "System Design"
date:   2024-07-24 16:19:18 +0530
summary: "Lets design a system"
description:  
cover:
  image:
  alt:
  caption: 
  relative: true
showtoc: true
draft: true
math: true
---


# Load Balancer

# Cache

# API

# Web Server


# Database 

## ACID Properties

- **Atomicity**: All operations in a transaction must be completed successfully. If any operation fails, the entire transaction fails.
- **Consistency**: The database must remain in a consistent state before and after the transaction.
- **Isolation**: Transactions should be isolated from each other. Changes made by one transaction should not be visible to other transactions until the transaction is complete.
- **Durability**: Once a transaction is committed, the changes made by the transaction should be permanent and should not be lost even if the system crashes.

ACID is generally used in relational databases like MySQL, PostgreSQL, Oracle, etc

## CAP Theorem

- **Consistency**: All nodes see the same data at the same time.
- **Availability**: Every request gets a response on success/failure.
- **Partition Tolerance**: The system continues to operate despite network partitions.

The CAP theorem states that a distributed system can only guarantee two of the three properties at any given time. NoSQL databases like MongoDB, Cassandra, Couchbase, etc. are designed to be AP systems. 



## Types of Databases


### SQL vs NoSQL
https://medium.com/geekculture/sql-vs-nosql-92fa8ec1758b

Relational databases are ACID compliant which means that any read or write operation is guaranteed to be consistent, isolated, and durable. NoSQL databases are eventually consistent which means that the data will eventually be consistent but not immediately. Therefore for critical applications like banking, finance, etc. relational databases are preferred so that the data is always consistent. 

However scaling relational databases is difficult as they are vertically scalable which means that you can only increase the capacity of the server by adding more CPU, RAM, etc. NoSQL databases are horizontally scalable which means that you can add more servers to increase the capacity of the database.



### Dynamo DB: 

- NoSQL database service provided by AWS
- Supports both document and key-value data models
- Other NoSQL databases: MongoDB, Cassandra, Couchbase, etc.

#### Example json storage:

```json
{
  "users": {
    "user1": {
      "name": "John Doe",
      "age": 30,
      "email": "
    },
    "user2": {
      "name": "Jane Doe",
      "age": 25,
      "email": "
    }
    }
}
```


- RDS:
    - Relational Database Service provided by AWS
    - Supports MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and Amazon Aurora
    - Best for reltional data like tables, rows, columns, etc.
    - Good for complex queries and transactions.
    - ACID properties (Atomicity, Consistency, Isolation, Durability)

Example markdown table:

#### Table: Users

ID | Name | Age | 
|-----|------|-----|
| 1 | John Doe | 30 |
| 2 | Jane Doe | 25 |
| 3 | Alice | 22 |

#### Table: Orders

ID | User ID | Product | Quantity |
|-----|------|-----|-----|
| 1 | 1 | iPhone | 1 |
| 2 | 1 | Macbook | 1 |
| 2 | 2 | Macbook | 1 |
| 3 | 3 | iPad | 2 |


### Redis

- In-memory data structure store
- Expensive but fast


## Database Sharding


## Database Replication










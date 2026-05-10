# SQL — Formatter + Diagnostics Test

Press `Shift+Alt+F` to format all blocks. Formatting uses `prettier-plugin-sql` (bundled — no external tools required). Diagnostics surface Prettier parse errors with line/col positions.
Check **View → Output → Markdown Code Assistant** if blocks are skipped.

---

## Formatting — basic SELECT (prettier-plugin-sql will normalise casing and indentation)

```sql
select id,first_name,last_name,email from users where active=1 and created_at>'2024-01-01' order by last_name asc,first_name asc limit 100
```

## Formatting — JOIN with subquery

```sql
select o.id,o.total,u.email,u.first_name from orders o inner join users u on o.user_id=u.id where o.status='completed' and o.total>(select avg(total) from orders where status='completed') order by o.created_at desc
```

## Formatting — DDL (CREATE TABLE)

```sql
CREATE TABLE IF NOT EXISTS products(id SERIAL PRIMARY KEY,sku VARCHAR(64) NOT NULL UNIQUE,name TEXT NOT NULL,price NUMERIC(10,2) NOT NULL DEFAULT 0.00,stock INT NOT NULL DEFAULT 0,category_id INT REFERENCES categories(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
```

## Formatting — INSERT with multiple rows

```sql
insert into categories(id,name,slug) values(1,'Electronics','electronics'),(2,'Books','books'),(3,'Home & Garden','home-garden') on conflict(slug) do update set name=excluded.name;
```

## Formatting — CTE + window function

```sql
with monthly_revenue as(select date_trunc('month',created_at) as month,sum(total) as revenue,count(*) as order_count from orders where status='completed' group by 1) select month,revenue,order_count,revenue-lag(revenue) over(order by month) as mom_delta,round(100.0*(revenue-lag(revenue) over(order by month))/nullif(lag(revenue) over(order by month),0),2) as mom_pct from monthly_revenue order by month
```

## Formatting — UPDATE with RETURNING

```sql
update products set stock=stock-1,updated_at=now() where id=42 and stock>0 returning id,sku,stock
```

## Formatting — complex DELETE

```sql
delete from sessions where user_id in(select id from users where last_login<now()-interval '90 days' and active=false) returning id,user_id,created_at
```

---

## Diagnostics — valid query (no errors expected)

```sql
SELECT id, name, email
FROM users
WHERE active = TRUE
ORDER BY name ASC;
```

## Diagnostics — syntax error (missing FROM keyword)

```sql
SELECT id, name
users
WHERE active = TRUE;
```

## Diagnostics — unclosed string literal

```sql
SELECT id, name
FROM users
WHERE email = 'user@example.com
AND active = TRUE;
```

## Diagnostics — unexpected token

```sql
SELECT id, COUNT(*) AS total
FROM orders
GROUP users;
```

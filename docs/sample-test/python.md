# Python — Formatter Test (requires Black)

Press `Shift+Alt+F` to format all blocks. Black must be installed (`pip install black`).
Check **View → Output → MD Code Assist** if blocks are skipped.

---

## Formatting — functions and spacing (Black will fix this)

```python
def   greet(name,greeting='Hello'):
    return   greeting+', '+name+'!'


x=greet('Alice')
y=greet('Bob',greeting='Hi')
print(x,y)
```

## Formatting — classes

```python
class Animal:
  def __init__(self,name,species):
    self.name=name
    self.species=species
  def speak(self):
    raise NotImplementedError
  def __repr__(self):
    return f'Animal(name={self.name!r}, species={self.species!r})'

class Dog(Animal):
  def __init__(self,name):
    super().__init__(name,'Canis lupus familiaris')
  def speak(self):
    return 'Woof!'
```

## Formatting — list comprehensions and lambdas

```python
numbers=[1,2,3,4,5,6,7,8,9,10]
evens=[x for x in numbers if x%2==0]
squares={x:x**2 for x in range(1,11)}
total=sum(x for x in numbers if x>5)

sorter=lambda items,key=None,reverse=False:sorted(items,key=key,reverse=reverse)
```

## Formatting — decorators and type hints

```python
from functools import wraps
from typing import Callable,TypeVar

T=TypeVar('T')

def retry(times:int=3)->Callable:
  def decorator(fn:Callable)->Callable:
    @wraps(fn)
    def wrapper(*args,**kwargs):
      for attempt in range(times):
        try:
          return fn(*args,**kwargs)
        except Exception as e:
          if attempt==times-1:
            raise
    return wrapper
  return decorator

@retry(times=5)
def unstable_call(url:str)->dict:
  import urllib.request
  with urllib.request.urlopen(url) as r:
    return r.read()
```

## Formatting — async/await

```python
import asyncio

async def fetch(session,url:str)->bytes:
  async with session.get(url) as response:
    return await response.read()

async def main():
  import aiohttp
  urls=['https://httpbin.org/get','https://httpbin.org/ip']
  async with aiohttp.ClientSession() as session:
    results=await asyncio.gather(*[fetch(session,u) for u in urls])
  return results
```

## Formatting — dataclasses

```python
from dataclasses import dataclass,field
from typing import List

@dataclass
class Config:
  host:str='localhost'
  port:int=8080
  tags:List[str]=field(default_factory=list)
  debug:bool=False

  def url(self)->str:
    return f'http://{self.host}:{self.port}'
```

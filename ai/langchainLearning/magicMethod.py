class Pipe:
    # 管道基类
    def __or__(self, other):
        return Chain(self, other)

class Chain(Pipe):
    # 组合基类
    def __init__(self, one, two):
        self.one = one
        self.two = two

    def invoke(self, x, y):
        a = self.one.invoke(x, y)
        return self.two.invoke(a, y)

class Sum(Pipe):
    def invoke(self, x, y):
        return x + y

class Multiplication(Pipe):
    def invoke(self, x, y):
        return x * y
sum1 = Sum()
dd = Multiplication()
chain = sum1 | dd | dd
print(chain.invoke(5, 3))
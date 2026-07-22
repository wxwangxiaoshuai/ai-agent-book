import os

from common import client

messages = [
    {"role": "system", "content": "你是一个 helpful的助手。"},
]


while True:
    user_input = input("你：")

    if user_input in ('quit','exit'):
        print("再见！")
        break
    if not user_input:
        continue

    messages.append({"role": "user", "content": user_input})
    response = client.chat.completions.create(
        model=os.getenv("MODEL_NAME"),
        messages=messages
    )
    messages.append({"role": "assistant", "content": response.choices[0].message.content})
    print("助手：\n", response.choices[0].message.content)

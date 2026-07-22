import os
from common import client
from pathlib import Path

HISTORY_FILE = Path.home() / ".cli_assistant_history.json"
messages = []
roles = {
    "default": "你是一个友好的 AI 助手。",
    "coder": "你是一位资深 Python 工程师，擅长代码审查和性能优化。回答简洁直接。",
    "translator": "你是一位专业的中英翻译，所有回复都用英文。",
    "teacher": "你是一位耐心的编程老师，用通俗语言解释概念，配合代码示例。",
}
current_role = "default"
while True:
    user_input = input("你：")

    if user_input in ('quit','exit'):
        print("再见！")
        break
    if not user_input:
        continue
    if user_input.startswith("/role "):
        role_name = user_input.split(" ")[1]
        if role_name in roles:
            current_role = role_name
        else:
            print(f"未知角色: {role_name}，可选: {', '.join(roles.keys())}")
        continue
    messages.append({"role": "system", "content": roles[current_role]})
    messages.append({"role": "user", "content": user_input})
    response = client.chat.completions.create(
        model=os.getenv("MODEL_NAME"),
        messages=messages,
        stream=True
    )
    print("助手：", end="", flush=True)
    full_reply = ""
    for chunk in response:
        if chunk and chunk.choices and chunk.choices[0].delta.content:
            full_reply += chunk.choices[0].delta.content
            print(chunk.choices[0].delta.content, end="", flush=True)
    assistant_message = {"role": "assistant", "content": full_reply}
    messages.append(assistant_message)
    print()

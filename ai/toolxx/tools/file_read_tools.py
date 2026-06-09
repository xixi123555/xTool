def read_file(path):
    """ 读取指定文件的内容 """
    all_content = ""
    with open(path,"r", encoding="utf-8") as f:
        all_content = f.read()
    return all_content
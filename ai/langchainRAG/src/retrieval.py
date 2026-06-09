def retrieval(db, question):
    return db.similarity_search(
        question,
        k = 3
    )
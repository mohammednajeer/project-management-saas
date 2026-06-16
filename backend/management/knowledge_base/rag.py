from knowledge_base.search import search_documents
from ai_assistant.providers.gemini_provider import generate_text


def ask_rag(question,organization):

    docs = search_documents(question,organization)

    context = "\n\n".join([
        f"Title: {doc.title}\n{doc.content}"
        for doc in docs
    ])

    prompt = f"""
Answer the question using ONLY the provided context.

Context:
{context}

Question:
{question}

If the answer is not in the context,
say:
'I could not find that information in the knowledge base.'
"""

    return generate_text(prompt)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .rag import ask_rag


class AskRAGView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        question = request.data.get("question")

        answer = ask_rag(question, request.user.organization)

        return Response({
            "answer": answer
        })
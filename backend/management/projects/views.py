from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Project
from .serializers import ProjectSerializer


class ProjectListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        projects = Project.objects.filter(
            organization=request.user.organization
        )

        serializer = ProjectSerializer(
            projects,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        serializer = ProjectSerializer(
            data=request.data
        )

        if serializer.is_valid():

            project = serializer.save(
                organization=request.user.organization,
                created_by=request.user
            )

            project.members.add(request.user)

            return Response(
                ProjectSerializer(project).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from accounts.models import User
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
    

# 

class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, project_id, user):

        try:

            return Project.objects.get(
                id=project_id,
                organization=user.organization
            )

        except Project.DoesNotExist:

            return None

    def get(self, request, project_id):

        project = self.get_object(
            project_id,
            request.user
        )

        if not project:

            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectSerializer(
            project
        )

        return Response(serializer.data)

    def patch(self, request, project_id):

        project = self.get_object(
            project_id,
            request.user
        )

        if not project:

            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectSerializer(
            project,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, project_id):

        project = self.get_object(
            project_id,
            request.user
        )

        if not project:

            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        project.delete()

        return Response(
            {
                "message":
                "Project deleted"
            }
        )
    

class ProjectMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):

        try:

            project = Project.objects.get(
                id=project_id,
                organization=request.user.organization
            )

        except Project.DoesNotExist:

            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        user_ids = request.data.get(
            "members",
            []
        )

        users = User.objects.filter(
            id__in=user_ids,
            organization=request.user.organization
        )

        project.members.add(*users)

        return Response(
            ProjectSerializer(project).data
        )

    def delete(self, request, project_id):

        try:

            project = Project.objects.get(
                id=project_id,
                organization=request.user.organization
            )

        except Project.DoesNotExist:

            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        user_id = request.data.get(
            "user_id"
        )

        try:

            user = User.objects.get(
                id=user_id,
                organization=request.user.organization
            )

        except User.DoesNotExist:

            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        project.members.remove(user)

        return Response(
            ProjectSerializer(project).data
        )
pipeline {
  agent any

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'video-editor'
  }

  options {
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Images') {
      steps {
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE build --no-cache --pull'
      }
    }

    stage('Deploy') {
      steps {
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE down'
        sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE up -d --force-recreate --remove-orphans'
      }
    }
  }

  post {
    always {
      sh 'docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE ps'
    }
  }
}

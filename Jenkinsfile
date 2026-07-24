pipeline {
    agent any
    tools {
        jdk 'jdk21'
        nodejs 'node24'
    }
    environment {
        SCANNER_HOME = tool 'sonar-scanner'
    }
    stages {
        stage('clean workspace') {
            steps {
                cleanWs()
            }
        }
        stage('Checkout from Git') {
            steps {
                git branch: 'main', url: 'https://github.com/Suraajj252/DevSecOps-project.git'
            }
        }
        stage("Sonarqube Analysis") {
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh '''$SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=Netflix \
                    -Dsonar.projectKey=Netflix'''
                }
            }
        }
        stage("quality gate") {
            steps {
                script {
                    waitForQualityGate abortPipeline: true, credentialsId: 'Sonar-token'
                }
            }
        }
        stage('Install Dependencies') {
            steps {
                sh "npm install"
            }
        }
        stage('OWASP FS SCAN') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', odcInstallation: 'DP-Check'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml', failedTotalCritical: 1
            }
        }
        stage('TRIVY FS SCAN') {
            steps {
                sh "trivy fs --exit-code 1 --severity HIGH,CRITICAL . | tee trivyfs.txt"
            }
        }
        stage("Docker Build") {
            steps {
                script {
                    withCredentials([
                        string(credentialsId: 'trakt-client-id', variable: 'TRAKT_CLIENT_ID'),
                        string(credentialsId: 'omdb-api-key', variable: 'OMDB_API_KEY')
                    ]) {
                        sh '''
                            docker build \
                              --build-arg VITE_APP_TRAKT_CLIENT_ID=$TRAKT_CLIENT_ID \
                              --build-arg VITE_APP_OMDB_API_KEY=$OMDB_API_KEY \
                              -t netflix:latest .
                        '''
                    }
                }
            }
        }
        stage("TRIVY Image Scan") {
            steps {
                sh "trivy image --exit-code 1 --severity HIGH,CRITICAL netflix:latest | tee trivyimage.txt"
            }
        }
        stage('Deploy to Container') {
            steps {
                sh '''
                    docker stop netflix || true
                    docker rm netflix || true
                    docker run -d --name netflix -p 8081:80 netflix:latest
                '''
            }
        }
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    dir('Kubernetes') {
                        withKubeConfig(caCertificate: '', clusterName: '', contextName: '', credentialsId: 'k8s', namespace: '', restrictKubeConfigAccess: false, serverUrl: '') {
                            sh 'kubectl apply -f deployment.yml'
                            sh 'kubectl apply -f service.yml'
                        }
                    }
                }
            }
        }
    }
    post {
        always {
            emailext attachLog: true,
                subject: "'${currentBuild.result}'",
                body: "Project: ${env.JOB_NAME}<br/>Build Number: ${env.BUILD_NUMBER}<br/>URL: ${env.BUILD_URL}<br/>",
                to: 'your-email@example.com',
                attachmentsPattern: 'trivyfs.txt,trivyimage.txt'
        }
    }
}

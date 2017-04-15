var pointlightmarkerglslv =`
uniform mat4    uPMatrix;
attribute vec3  aVertexPosition;

void main(void) 
{
    gl_PointSize = 10.0;        
    gl_Position = uPMatrix * vec4(aVertexPosition, 1.0);
}
`;

export const hairVertexShader = `

#include <common>
#include <shadowmap_pars_vertex>

out vec3 dir;

void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    
    #include <begin_vertex>

    #include <worldpos_vertex>
    #include <shadowmap_vertex>

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;

    gl_Position = clipPosition;
}
`
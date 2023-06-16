
export const hairFragmentShader = `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

in vec3 dir;
out vec4 fragColor;

uniform vec3 uColor;

void main() {
    DirectionalLightShadow directionalShadow = directionalLightShadows[0];

    float shadow = getShadow(
        directionalShadowMap[0],
        directionalShadow.shadowMapSize,
        directionalShadow.shadowBias,
        directionalShadow.shadowRadius,
        vDirectionalShadowCoord[0]
    );
    vec3 light = (directionalLights[0].color * shadow) + ambientLightColor;

    fragColor = vec4(uColor * light,1.0);
}
`;
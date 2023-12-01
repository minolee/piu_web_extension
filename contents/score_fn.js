const score_range = [
    [700000, 749999], // B
    [750000, 799999], // A
    [800000, 899999], // A+
    [900000, 924999], // AA
    [925000, 949999], // AA+
    [950000, 959999], // AAA
    [960000, 969999], // AAA+
    [970000, 974999], // S
    [975000, 979999], // S+
    [980000, 984999], // SS
    [985000, 989999], // SS+
    [990000, 994999], // SSS
    [995000, 1000000], // SSS+
]

function get_rank(score) {
    for (let i = 0; i < score_range.length; i++) {
        if (score >= score_range[i][0] && score <= score_range[i][1]) {
            return i
        }
    }
    return -1
}
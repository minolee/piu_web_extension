/*
 Rating 관련 스크립트
*/

function calculate_converted_rating(level_const, score) {
    // arcaea식 rating 계산, 숫자 기준만 약간 다름
    const score_rating = score < 970000 ? (score - 925000) / 45000 : (score < 990000 ? (score - 970000) / 20000 + 1 : (score - 990000) / 10000 + 2)
    return score_rating * level_const
}


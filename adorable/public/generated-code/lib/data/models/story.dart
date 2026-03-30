import 'package:meta/meta.dart';

@immutable
class Story {
  final int id;
  final String label;
  final bool viewed;

  const Story({required this.id, required this.label, this.viewed = false});

  static Story fromJson(Map<String, dynamic> json) {
    return Story(id: json['id'] as int, label: json['label'] as String, viewed: json['viewed'] as bool);
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'label': label,
      'viewed': viewed,
    };
  }

  Story copyWith({int? id, String? label, bool? viewed}) {
    return Story(id: id ?? this.id, label: label ?? this.label, viewed: viewed ?? this.viewed);
  }
}

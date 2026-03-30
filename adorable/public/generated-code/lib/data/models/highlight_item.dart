import 'package:meta/meta.dart';

@immutable
class HighlightItem {
  final int id;
  final String title;
  final String coverLabel;

  const HighlightItem({required this.id, required this.title, required this.coverLabel});

  static HighlightItem fromJson(Map<String, dynamic> json) {
    return HighlightItem(id: json['id'] as int, title: json['title'] as String, coverLabel: json['coverLabel'] as String);
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'coverLabel': coverLabel,
    };
  }

  HighlightItem copyWith({int? id, String? title, String? coverLabel}) {
    return HighlightItem(id: id ?? this.id, title: title ?? this.title, coverLabel: coverLabel ?? this.coverLabel);
  }
}
